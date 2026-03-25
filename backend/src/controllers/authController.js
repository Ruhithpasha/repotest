const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { UserRepository, SessionRepository } = require('../repositories');
const { Referral, User, Student, AuditLog } = require('../models/pg');

const JWT_SECRET = process.env.JWT_SECRET || 'plan4growth-secret-key-2024';
const JWT_EXPIRATION = '7d';

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { user_id: userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, referred_by, referral_code } = req.body;

    // Check if user exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const user = await UserRepository.createUser({
      user_id: userId,
      email,
      password: hashedPassword,
      name,
      phone,
      role: 'student'
    });

    // Handle referral if provided
    if (referred_by && referral_code) {
      try {
        // Verify referrer exists and is valid
        const referrer = await User.findByPk(referred_by);
        if (referrer && referrer.referral_code === referral_code.toUpperCase()) {
          // Check if referral record already exists (from click tracking)
          let referralRecord = await Referral.findOne({
            where: {
              referral_code: referral_code.toUpperCase(),
              referred_email: ''
            }
          });

          if (referralRecord) {
            // Update existing record
            await referralRecord.update({
              referred_email: email.toLowerCase(),
              referred_name: name,
              status: 'registered',
              registered_at: new Date()
            });
          } else {
            // Create new referral record
            await Referral.create({
              referral_id: `ref_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
              referrer_user_id: referred_by,
              referral_code: referral_code.toUpperCase(),
              referred_email: email.toLowerCase(),
              referred_name: name,
              status: 'registered',
              registered_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
          }

          // Log the referral registration
          await AuditLog.create({
            log_id: `log_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
            user_id: userId,
            action_type: 'referral_registration',
            object_type: 'user',
            object_id: userId,
            description: JSON.stringify({ 
              referrer_id: referred_by, 
              referral_code: referral_code 
            }),
            actor_role: 'student'
          });

          console.log(`[Auth] User ${userId} registered via referral from ${referred_by}`);
        }
      } catch (refError) {
        console.error('[Auth] Error processing referral:', refError);
        // Don't fail registration if referral processing fails
      }
    }

    // Generate token
    const token = generateToken(userId, email, 'student');

    // Create Student record for self-registered user
    const studentId = `stu_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const application_token = uuidv4();
    await Student.create({
      student_id: studentId,
      user_id: userId,
      email: email,
      name: name,
      rep_id: null,
      status: 'registered',
      registration_source: 'self',
      application_token: application_token,
      referral_code_used: referral_code || null
    });

    res.json({
      token,
      user: {
        user_id: userId,
        email,
        name,
        role: 'student'
      },
      student_id: studentId,
      application_token: application_token,
      upload_url: `/apply/documents?token=${application_token}`
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ detail: 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, bypass_sso } = req.body;

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Check if account is active (students must be approved first)
    if (!user.is_active) {
      return res.status(403).json({ 
        detail: 'Your account is pending approval. You will receive login credentials after admin approval.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password || '');
    if (!validPassword) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.user_id, user.email, user.role);

    const userData = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      picture: user.picture
    };

    // Check if user is an enrolled student for SSO redirect
    if (!bypass_sso && user.role === 'student') {
      const student = await Student.findOne({ where: { user_id: user.user_id } });
      const enrolledStatuses = ['enrolled', 'paid_in_full', 'commission_earned', 'commission_released'];
      
      if (student && enrolledStatuses.includes(student.status)) {
        // Generate SSO token and include redirect flag in response
        const ssoToken = jwt.sign(
          {
            email: user.email,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name,
            student_id: student.student_id,
            source: 'plan4growth_portal'
          },
          process.env.SSO_SECRET_KEY || 'sso-fallback-secret-key',
          { expiresIn: '5m' }
        );
        return res.json({
          token,
          user: userData,
          sso_redirect: `${process.env.COURSE_PLATFORM_URL || 'https://plan4growth.uk'}/api/sso?token=${ssoToken}`
        });
      }
    }

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Login failed' });
  }
};

// Process OAuth session
exports.processSession = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ detail: 'session_id required' });
    }

    // Call Emergent Auth to get user data
    const response = await axios.get(
      'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
      { headers: { 'X-Session-ID': session_id } }
    );

    const userData = response.data;

    // Check if user exists
    let user = await UserRepository.findByEmail(userData.email);
    let isNewUser = false;

    if (user) {
      // Update existing user
      await UserRepository.updateUser(user.user_id, {
        name: userData.name || user.name,
        picture: userData.picture
      });
      user = await UserRepository.findByUserId(user.user_id);
    } else {
      // Create new user
      isNewUser = true;
      const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      user = await UserRepository.createUser({
        user_id: userId,
        email: userData.email,
        name: userData.name || '',
        picture: userData.picture,
        role: 'student'
      });
    }

    // Ensure Student record exists for student role users
    let applicationToken = null;
    if (user.role === 'student') {
      let student = await Student.findOne({ where: { user_id: user.user_id } });
      if (!student) {
        const studentId = `stu_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        const application_token = uuidv4();
        student = await Student.create({
          student_id: studentId,
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          rep_id: null,
          status: 'registered',
          registration_source: 'self',
          application_token: application_token
        });
        console.log(`[Auth] Created Student record for OAuth user: ${studentId}`);
      }
      applicationToken = student.application_token;
    }

    // Create/update session
    const sessionToken = userData.session_token || `session_${uuidv4().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await SessionRepository.upsertSession(user.user_id, sessionToken, expiresAt);

    // Set cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ ...user.toJSON(), application_token: applicationToken, is_new_user: isNewUser });
  } catch (error) {
    console.error('Session processing error:', error);
    res.status(500).json({ detail: 'Failed to verify session' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    res.json({
      user_id: req.user.user_id,
      email: req.user.email,
      name: req.user.name || '',
      picture: req.user.picture,
      role: req.user.role || 'student'
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ detail: 'Failed to get user' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.session_token;
    if (sessionToken) {
      await SessionRepository.deleteByToken(sessionToken);
    }

    res.clearCookie('session_token', {
      path: '/',
      secure: true,
      sameSite: 'none'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ detail: 'Logout failed' });
  }
};

// Generate SSO Token for course platform redirect
exports.generateSSOToken = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const user = await User.findByPk(userId);
    const student = await Student.findOne({ where: { user_id: userId } });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const enrolledStatuses = ['enrolled', 'paid_in_full', 'commission_earned', 'commission_released'];
    if (!enrolledStatuses.includes(student.status)) {
      return res.status(403).json({ error: 'Student is not enrolled' });
    }

    const ssoToken = jwt.sign(
      {
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name,
        student_id: student.student_id,
        source: 'plan4growth_portal'
      },
      process.env.SSO_SECRET_KEY || 'sso-fallback-secret-key',
      { expiresIn: '5m' }
    );

    const redirectUrl = `${process.env.COURSE_PLATFORM_URL || 'https://plan4growth.uk'}/api/sso?token=${ssoToken}`;
    return res.json({ redirect_url: redirectUrl });
  } catch (err) {
    console.error('generateSSOToken error:', err);
    return res.status(500).json({ error: 'Failed to generate SSO token' });
  }
};
