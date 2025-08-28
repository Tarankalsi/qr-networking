const Joi = require("joi");

const exhibitorSetup = Joi.object({
    exhibitorId: Joi.string().uuid().required(),
    contactName: Joi.string().min(2).max(100).required(),
    contactEmail: Joi.string().email().required(),
    contactPhone: Joi.string().min(10).max(20).allow(''),
    companyWebsite: Joi.string().uri().allow(''),
    boothDescription: Joi.string().max(500).allow('')
});

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(8).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// Validation schemas
const createExhibitorSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().min(10).max(20).allow('').allow(null),
  companyName: Joi.string().min(2).max(255).required(),
});

// Validation schemas
const profileSchema = Joi.object({
  profileSlug: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required(),
  displayName: Joi.string().min(2).max(100).required(),
  tagline: Joi.string().max(200).allow('').allow(null),
  description: Joi.string().max(1000).allow('').allow(null),
  contactPerson: Joi.string().min(2).max(100).required(),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().min(10).max(20).allow('').allow(null),
  websiteUrl: Joi.string().uri().allow('').allow(null),
  boothNumber: Joi.string().max(20).allow('').allow(null),
  boothLocation: Joi.string().max(100).allow('').allow(null),
  address: Joi.string().max(200).allow('').allow(null),
  linkedinUrl: Joi.string().uri().allow('').allow(null),
  twitterUrl: Joi.string().uri().allow('').allow(null),
  instagramUrl: Joi.string().uri().allow('').allow(null),
  facebookUrl: Joi.string().uri().allow('').allow(null)
});


module.exports = {
    exhibitorSetup,
    loginSchema,
    changePasswordSchema,
    profileSchema,
    createExhibitorSchema
}