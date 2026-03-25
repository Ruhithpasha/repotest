// Default course data
const DEFAULT_COURSE = {
  course_id: 'course_implantology_l7',
  title: 'Level 7 Diploma in Dental Implantology',
  description: 'UK-accredited EduQual Level 7 qualification, equivalent to Master\'s degree level, designed for dentists seeking to specialise in dental implantology.',
  duration: '12 months',
  mode: 'Online Academic Modules + UK Clinical Training',
  fee_gbp: 7999.00,
  accreditation: 'EduQual (UK Regulated Awarding Body)',
  modules: [
    'Foundations of Implantology',
    'Patient Assessment & Treatment Planning',
    'Surgical Techniques',
    'Bone Grafting & Augmentation',
    'Restorative Implantology',
    'Full Arch Rehabilitation',
    'Complications Management',
    'Case Documentation & Portfolio'
  ],
  eligibility: [
    'BDS degree or equivalent dental qualification',
    'Registration with a recognised dental council',
    'Studied dentistry in English medium',
    'Actively practising dentistry'
  ],
  installment_option: true,
  deposit_percentage: 40,
  deposit_days: 90
};

// Get all courses
exports.getCourses = async (req, res) => {
  try {
    // For now, return default course
    res.json([DEFAULT_COURSE]);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ detail: 'Failed to get courses' });
  }
};

// Get course by ID
exports.getCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (courseId === 'course_implantology_l7') {
      return res.json(DEFAULT_COURSE);
    }

    res.status(404).json({ detail: 'Course not found' });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ detail: 'Failed to get course' });
  }
};
