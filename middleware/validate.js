const { validationResult } = require("express-validator");
// Middleware function to check if all fields are non-empty
const validateFields = (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Check if all fields are non-empty
  const fields = Object.values(req.body);
  const allFieldsNonEmpty = fields.every((field) => typeof field === 'string' && field.trim() !== "");
  if (!allFieldsNonEmpty) {
    return res.status(400).json({ error: "All fields must be non-empty." });
  }
  // If all checks pass, proceed to the next middleware
  next();
};
module.exports = {
  validateFields,
};
