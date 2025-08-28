const Joi = require("joi");

// Validation schemas
const visitorSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(20).allow('').allow(null),
  company: Joi.string().max(100).allow('').allow(null),
  position: Joi.string().max(100).allow('').allow(null),
  consentGiven: Joi.boolean().required()
});

module.exports = {
  visitorSchema 
};