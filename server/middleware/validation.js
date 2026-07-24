import { BadRequestError } from '../utils/errors.js';

// Sanitize strings to remove dangerous control characters and trims whitespaces
const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/[\x00-\x1F\x7F]/g, '');
};

// Safe email pattern check
const isValidEmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

// Validation middleware generator
const validate = (schemaFn) => {
  return (req, res, next) => {
    try {
      schemaFn(req);
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Register Schema Check
export const validateRegister = validate((req) => {
  let { companyName, userName, email, password } = req.body;

  companyName = sanitizeString(companyName);
  userName = sanitizeString(userName);
  email = sanitizeString(email);

  if (!companyName || !userName || !email || !password) {
    throw new BadRequestError('All fields (companyName, userName, email, password) are required.', 'VALIDATION_FAILED');
  }

  if (!isValidEmail(email)) {
    throw new BadRequestError('Please provide a valid email address.', 'VALIDATION_FAILED');
  }

  // Password strength check: Min 8 chars, at least one letter and one number
  if (password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters long.', 'VALIDATION_FAILED');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new BadRequestError('Password must contain at least one letter and one number.', 'VALIDATION_FAILED');
  }

  // Update sanitized fields back on request body
  req.body.companyName = companyName;
  req.body.userName = userName;
  req.body.email = email;
});

// Login Schema Check
export const validateLogin = validate((req) => {
  let { email, password } = req.body;

  email = sanitizeString(email);

  if (!email || !password) {
    throw new BadRequestError('Email and password parameters are required.', 'VALIDATION_FAILED');
  }

  if (!isValidEmail(email)) {
    throw new BadRequestError('Please provide a valid email address format.', 'VALIDATION_FAILED');
  }

  req.body.email = email;
});

// CRM Contacts Patch Schema Check
export const validateContactUpdate = validate((req) => {
  const { name, email, phone, leadStatus, tags } = req.body;

  if (name !== undefined) {
    req.body.name = sanitizeString(name);
    if (!req.body.name) {
      throw new BadRequestError('Name cannot be empty.', 'VALIDATION_FAILED');
    }
  }

  if (email !== undefined) {
    if (email !== null && email !== '') {
      req.body.email = sanitizeString(email).toLowerCase();
      if (!isValidEmail(req.body.email)) {
        throw new BadRequestError('Email address format is invalid.', 'VALIDATION_FAILED');
      }
    } else {
      req.body.email = null;
    }
  }

  if (phone !== undefined) {
    if (phone !== null && phone !== '') {
      req.body.phone = sanitizeString(phone);
    } else {
      req.body.phone = null;
    }
  }

  if (leadStatus !== undefined) {
    const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    if (!statuses.includes(leadStatus)) {
      throw new BadRequestError('Invalid lead status option.', 'VALIDATION_FAILED');
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw new BadRequestError('Tags must be an array of strings.', 'VALIDATION_FAILED');
    }
    req.body.tags = tags.map(t => sanitizeString(t)).filter(t => t.length > 0);
  }
});

// CRM Notes Post Schema Check
export const validateNoteCreate = validate((req) => {
  let { content } = req.body;

  if (content === undefined || content === null) {
    throw new BadRequestError('Note content content is required.', 'VALIDATION_FAILED');
  }

  content = sanitizeString(content);
  if (!content) {
    throw new BadRequestError('Note content content cannot be empty.', 'VALIDATION_FAILED');
  }

  if (content.length > 5000) {
    throw new BadRequestError('Note content cannot exceed 5000 characters.', 'VALIDATION_FAILED');
  }

  req.body.content = content;
});

// Meta credentials configuration check
export const validateWhatsappConnect = validate((req) => {
  let { phoneNumberId, accessToken, businessAccountId } = req.body;

  phoneNumberId = sanitizeString(phoneNumberId);
  accessToken = sanitizeString(accessToken);
  businessAccountId = sanitizeString(businessAccountId);

  if (!phoneNumberId || !accessToken || !businessAccountId) {
    throw new BadRequestError('All fields (phoneNumberId, accessToken, businessAccountId) are required.', 'VALIDATION_FAILED');
  }

  req.body.phoneNumberId = phoneNumberId;
  req.body.accessToken = accessToken;
  req.body.businessAccountId = businessAccountId;
});

// Twilio voice credentials configuration check
export const validateVoiceConnect = validate((req) => {
  let { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = req.body;

  twilioAccountSid = sanitizeString(twilioAccountSid);
  twilioAuthToken = sanitizeString(twilioAuthToken);
  twilioPhoneNumber = sanitizeString(twilioPhoneNumber);

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new BadRequestError('All fields (twilioAccountSid, twilioAuthToken, twilioPhoneNumber) are required.', 'VALIDATION_FAILED');
  }

  req.body.twilioAccountSid = twilioAccountSid;
  req.body.twilioAuthToken = twilioAuthToken;
  req.body.twilioPhoneNumber = twilioPhoneNumber;
});
