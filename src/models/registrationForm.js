// Registration form rules (pure, shared by the Register page and tests). Field limits mirror
// firestore.rules so the form never submits something the rules would reject.

export const FIELD_LIMITS = Object.freeze({
  firstName: 100,
  lastName: 100,
  phone: 30,
  otherHealthConditions: 1000,
  foodAllergies: 500,
  referralSource: 250
});

// Display order (also the scroll-to-first-error order)
export const FORM_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'academicRole', 'isOver18', 'completedSkyBefore',
  'healthConditions', 'otherHealthConditions', 'foodAllergies', 'referralSource', 'agreeToAll3Days'
];

/** @returns {Record<string, string>} field -> message, only for invalid fields */
export function validateRegistrationForm(form) {
  const errors = {};
  const text = (v) => String(v || '').trim();

  if (!text(form.firstName)) errors.firstName = 'Please enter your first name.';
  if (!text(form.lastName)) errors.lastName = 'Please enter your last name.';
  if (!text(form.email)) errors.email = 'Sign in again so we can read your email address.';
  if (!text(form.phone)) errors.phone = 'Please enter a phone number we can call for orientation.';
  if (!form.academicRole) errors.academicRole = 'Please choose your UIUC role or affiliation.';
  if (!form.isOver18) errors.isOver18 = 'Please choose your age group.';
  if (!form.completedSkyBefore) errors.completedSkyBefore = 'Please tell us whether you have done a SKY retreat before.';
  if (!form.healthConditions?.length) errors.healthConditions = 'Please select at least one option (or "None").';
  if (form.healthConditions?.includes('Other') && !text(form.otherHealthConditions)) {
    errors.otherHealthConditions = 'Please describe the other health condition.';
  }
  if (!text(form.referralSource)) errors.referralSource = 'Please let us know how you heard about us.';
  if (form.agreeToAll3Days !== 'Yes') {
    errors.agreeToAll3Days = 'Attendance on all 3 days is required. Please confirm you can attend.';
  }

  Object.entries(FIELD_LIMITS).forEach(([field, max]) => {
    if (!errors[field] && text(form[field]).length > max) errors[field] = `Please keep this under ${max} characters.`;
  });

  return errors;
}

/**
 * Answers worth carrying over from a returning applicant's newest previous application.
 * Not carried over: "done SKY before" (may have changed), referral source, the 3-day commitment.
 */
export function prefillFromPreviousApplication(previous) {
  if (!previous) return {};
  return {
    firstName: previous.firstName || '',
    lastName: previous.lastName || '',
    phone: previous.phone || '',
    academicRole: previous.academicRole || '',
    isOver18: previous.isOver18 || '',
    healthConditions: Array.isArray(previous.healthConditions) ? previous.healthConditions : [],
    otherHealthConditions: previous.otherHealthConditions || '',
    foodAllergies: previous.foodAllergies || ''
  };
}
