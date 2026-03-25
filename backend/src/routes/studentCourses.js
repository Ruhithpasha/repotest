/**
 * Student Courses API Routes
 * Student facing endpoints for viewing and completing courses
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Module, ModuleProgress, Program, Student, StudentPayment } = require('../models/pg');
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware
router.use(authMiddleware);

// Get programme info for any student status (no enrolled gate)
router.get('/my-programme', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ detail: 'Student access required' });
    }

    const student = await Student.findOne({ where: { user_id: req.user.user_id } });
    if (!student) return res.status(404).json({ detail: 'Student not found' });

    // Find their programme via course_id
    if (!student.course_id) {
      return res.json({ enrolled: false, programme: null, student_status: student.status });
    }

    const programme = await Program.findByPk(student.course_id);

    if (!programme) {
      return res.json({ enrolled: false, programme: null, student_status: student.status });
    }

    // Get progress if enrolled
    let progress = null;
    if (student.status === 'enrolled') {
      const modules = await Module.findAll({
        where: { programme_id: student.course_id, is_active: true }
      });
      const progressRecords = await ModuleProgress.findAll({
        where: { 
          student_id: student.student_id,
          module_id: { [Op.in]: modules.map(m => m.module_id) }
        }
      });
      const completedCount = progressRecords.filter(p => p.status === 'completed').length;
      const totalModules = modules.length;
      progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    }

    res.json({
      enrolled: student.status === 'enrolled',
      student_status: student.status,
      programme: {
        programme_id: programme.program_id,
        name: programme.name,
        description: programme.description,
        duration: programme.duration,
        price_gbp: programme.price_gbp,
      },
      enrolled_at: student.enrolled_at || null,
      progress
    });
  } catch (error) {
    console.error('Get my programme error:', error);
    res.status(500).json({ detail: 'Failed to get programme info' });
  }
});

// Student role and enrollment check middleware
const requireEnrolledStudent = async (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ detail: 'Student access required' });
  }

  // Get student record
  const student = await Student.findOne({ 
    where: { user_id: req.user.user_id }
  });

  if (!student) {
    return res.status(403).json({ detail: 'Student record not found' });
  }

  // Check if student is enrolled (has paid_in_full status)
  if (student.status !== 'enrolled') {
    return res.status(403).json({ 
      detail: 'You must be enrolled to access courses',
      status: student.status
    });
  }

  req.student = student;
  next();
};

/**
 * GET /api/student/courses
 * Return all programmes the logged-in student is enrolled in
 */
router.get('/', requireEnrolledStudent, async (req, res) => {
  try {
    const student = req.student;

    // Get the programme this student is enrolled in
    const courseId = student.course_id;
    
    if (!courseId) {
      return res.json({
        courses: [],
        message: 'No courses found. Contact your advisor to get enrolled.'
      });
    }

    const programme = await Program.findByPk(courseId);
    
    if (!programme) {
      return res.json({
        courses: [],
        message: 'Course not found.'
      });
    }

    // Get all active modules for this programme
    const modules = await Module.findAll({
      where: { programme_id: courseId, is_active: true },
      order: [['order', 'ASC']]
    });

    // Get student's progress for these modules
    const progressRecords = await ModuleProgress.findAll({
      where: { 
        student_id: student.student_id,
        module_id: { [Op.in]: modules.map(m => m.module_id) }
      }
    });

    // Calculate progress
    const completedCount = progressRecords.filter(p => p.status === 'completed').length;
    const totalModules = modules.length;
    const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    // Calculate total duration
    const totalDuration = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);

    res.json({
      courses: [{
        id: programme.program_id,
        program_name: programme.name,
        currency: programme.currency || 'INR',
        list_price: parseFloat(programme.price_gbp || 0),
        totalModules,
        completedModules: completedCount,
        progressPercent,
        totalDuration,
        isComplete: completedCount === totalModules && totalModules > 0
      }]
    });
  } catch (error) {
    console.error('[StudentCourses] Error listing courses:', error);
    res.status(500).json({ detail: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/student/courses/:programmeId
 * Return programme details + all active modules with student's progress
 */
router.get('/:programmeId', requireEnrolledStudent, async (req, res) => {
  try {
    const { programmeId } = req.params;
    const student = req.student;

    // Verify student is enrolled in this programme
    if (student.course_id !== programmeId) {
      return res.status(403).json({ 
        detail: 'You are not enrolled in this course' 
      });
    }

    const programme = await Program.findByPk(programmeId);
    
    if (!programme) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Get all active modules
    const modules = await Module.findAll({
      where: { programme_id: programmeId, is_active: true },
      order: [['order', 'ASC']]
    });

    // Get student's progress
    const progressRecords = await ModuleProgress.findAll({
      where: { 
        student_id: student.student_id,
        module_id: { [Op.in]: modules.map(m => m.module_id) }
      }
    });

    const progressMap = {};
    progressRecords.forEach(p => {
      progressMap[p.module_id] = {
        status: p.status,
        started_at: p.started_at,
        completed_at: p.completed_at
      };
    });

    // Build modules with progress
    const modulesWithProgress = modules.map(m => ({
      id: m.module_id,
      title: m.title,
      description: m.description,
      content: m.content,
      order: m.order,
      duration_minutes: m.duration_minutes,
      status: progressMap[m.module_id]?.status || 'not_started',
      started_at: progressMap[m.module_id]?.started_at || null,
      completed_at: progressMap[m.module_id]?.completed_at || null
    }));

    // Calculate overall progress
    const completedCount = modulesWithProgress.filter(m => m.status === 'completed').length;
    const totalModules = modulesWithProgress.length;
    const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    const totalDuration = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);

    res.json({
      course: {
        id: programme.program_id,
        program_name: programme.name,
        currency: programme.currency || 'INR',
        list_price: parseFloat(programme.price_gbp || 0),
        totalModules,
        completedModules: completedCount,
        progressPercent,
        totalDuration,
        isComplete: completedCount === totalModules && totalModules > 0
      },
      modules: modulesWithProgress
    });
  } catch (error) {
    console.error('[StudentCourses] Error fetching course:', error);
    res.status(500).json({ detail: 'Failed to fetch course' });
  }
});

/**
 * PATCH /api/student/courses/:programmeId/modules/:moduleId/progress
 * Update module progress status
 */
router.patch('/:programmeId/modules/:moduleId/progress', requireEnrolledStudent, async (req, res) => {
  try {
    const { programmeId, moduleId } = req.params;
    const { status } = req.body;
    const student = req.student;

    // Validate status
    if (!['in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ 
        detail: 'Status must be in_progress or completed' 
      });
    }

    // Verify student is enrolled in this programme
    if (student.program_id !== programmeId && student.course_id !== programmeId) {
      return res.status(403).json({ 
        detail: 'You are not enrolled in this course' 
      });
    }

    // Verify module exists and belongs to this programme
    const module = await Module.findOne({
      where: { module_id: moduleId, programme_id: programmeId, is_active: true }
    });

    if (!module) {
      return res.status(404).json({ detail: 'Module not found' });
    }

    // Upsert progress record
    let progress = await ModuleProgress.findOne({
      where: { student_id: student.student_id, module_id: moduleId }
    });

    const now = new Date();

    if (progress) {
      // Update existing record
      const updates = { status };
      
      if (status === 'in_progress' && !progress.started_at) {
        updates.started_at = now;
      }
      
      if (status === 'completed') {
        updates.completed_at = now;
        if (!progress.started_at) {
          updates.started_at = now;
        }
      }

      await progress.update(updates);
    } else {
      // Create new record
      const progressId = `prog_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      progress = await ModuleProgress.create({
        progress_id: progressId,
        student_id: student.student_id,
        module_id: moduleId,
        student_user_id: req.user.user_id,
        status,
        started_at: now,
        completed_at: status === 'completed' ? now : null
      });
    }

    // Get updated overall progress
    const modules = await Module.findAll({
      where: { programme_id: programmeId, is_active: true }
    });

    const allProgress = await ModuleProgress.findAll({
      where: { 
        student_id: student.student_id,
        module_id: { [Op.in]: modules.map(m => m.module_id) }
      }
    });

    const completedCount = allProgress.filter(p => p.status === 'completed').length;
    const totalModules = modules.length;
    const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    const isComplete = completedCount === totalModules && totalModules > 0;

    res.json({
      module: {
        id: module.module_id,
        title: module.title,
        status: progress.status,
        started_at: progress.started_at,
        completed_at: progress.completed_at
      },
      overallProgress: {
        completedModules: completedCount,
        totalModules,
        progressPercent,
        isComplete
      }
    });
  } catch (error) {
    console.error('[StudentCourses] Error updating progress:', error);
    res.status(500).json({ detail: 'Failed to update progress' });
  }
});

module.exports = router;
