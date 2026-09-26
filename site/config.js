// Public configuration. Never put OAuth tokens, passwords or API keys here.
export const CONFIG = Object.freeze({
  mode: 'demo', // 'pilot' only after the preparation and end-to-end checks.
  endpoint: 'https://script.google.com/macros/s/AKfycbyhnM_tATf7jKU5JcoQzcnjBsOsidigKA44xIgvNxPzOf4lOZcZtMGZEPdKxlFFDrbf/exec',
  studyVersion: '1.0.0',
  consentVersion: '1.0.0',
  researcher: 'Aníbal Astobiza',
  institution: '',
  contactEmail: 'amastobiza@ugr.es',
  privacyUrl: '',
  retention: '',
  ethicsStatement: '',
  imagePath: '', // ./assets/mammogram-01.png after review, never a patient image.
  imageApproved: false,
  recruitmentOpen: false,
});
