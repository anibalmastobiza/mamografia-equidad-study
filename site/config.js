// Public configuration. Never put OAuth tokens, passwords or API keys here.
export const CONFIG = Object.freeze({
  mode: 'pilot',
  endpoint: 'https://script.google.com/macros/s/AKfycbyhnM_tATf7jKU5JcoQzcnjBsOsidigKA44xIgvNxPzOf4lOZcZtMGZEPdKxlFFDrbf/exec',
  studyVersion: '1.0.0',
  consentVersion: '1.0.0',
  researcher: 'Aníbal Astobiza',
  institution: '',
  contactEmail: 'amastobiza@ugr.es',
  privacyUrl: 'https://anibalmastobiza.github.io/mamografia-equidad-study/privacidad.html',
  retention: 'Las respuestas se conservarán mientras sean necesarias para completar el análisis y la verificación científica de este estudio. Al terminar esas tareas se eliminarán los registros individuales y se conservarán únicamente resultados agregados.',
  ethicsStatement: '',
  imagePath: './assets/mammogram-msynth-01.jpg',
  imageApproved: true, // Checked as a synthetic contextual stimulus; not a clinical validation.
  recruitmentOpen: true,
});
