/**
 * Default Nigerian construction-industry regulatory / professional bodies.
 * Seeds the Qualifications "professional registration" picker. Admins can add
 * more via Admin → Taxonomy (kind: regulatory_body); those merge with these.
 * value = canonical short tag stored on the registration; label/hint power search.
 */
export type BodyOption = { value: string; label: string; hint: string };

export const REGULATORY_BODIES: BodyOption[] = [
  // Architecture
  { value: "ARCON", label: "ARCON — Architects Registration Council of Nigeria", hint: "Architecture · regulatory" },
  { value: "NIA", label: "NIA — Nigerian Institute of Architects", hint: "Architecture · professional" },
  // Engineering (civil, structural, mechanical, electrical, MEP)
  { value: "COREN", label: "COREN — Council for the Regulation of Engineering in Nigeria", hint: "Engineering · regulatory" },
  { value: "NSE", label: "NSE — Nigerian Society of Engineers", hint: "Engineering · professional" },
  // Quantity surveying
  { value: "QSRBN", label: "QSRBN — Quantity Surveyors Registration Board of Nigeria", hint: "Quantity surveying · regulatory" },
  { value: "NIQS", label: "NIQS — Nigerian Institute of Quantity Surveyors", hint: "Quantity surveying · professional" },
  // Land / geomatics surveying
  { value: "SURCON", label: "SURCON — Surveyors Council of Nigeria", hint: "Surveying · regulatory" },
  { value: "NIS", label: "NIS — Nigerian Institution of Surveyors", hint: "Surveying · professional" },
  // Building
  { value: "CORBON", label: "CORBON — Council of Registered Builders of Nigeria", hint: "Building · regulatory" },
  { value: "NIOB", label: "NIOB — Nigerian Institute of Building", hint: "Building · professional" },
  // Town / urban planning
  { value: "TOPREC", label: "TOPREC — Town Planners Registration Council of Nigeria", hint: "Town planning · regulatory" },
  { value: "NITP", label: "NITP — Nigerian Institute of Town Planners", hint: "Town planning · professional" },
  // Estate surveying & valuation
  { value: "ESVARBON", label: "ESVARBON — Estate Surveyors & Valuers Registration Board of Nigeria", hint: "Estate surveying · regulatory" },
  { value: "NIESV", label: "NIESV — Nigerian Institution of Estate Surveyors & Valuers", hint: "Estate surveying · professional" },
  // Mining & geoscience
  { value: "COMEG", label: "COMEG — Council of Nigerian Mining Engineers & Geoscientists", hint: "Mining & geoscience · regulatory" },
  // Health & safety
  { value: "ISPON", label: "ISPON — Institute of Safety Professionals of Nigeria", hint: "Health & safety · professional" },
  // Project / construction management (international, widely held in NG)
  { value: "PMI", label: "PMI — Project Management Institute", hint: "Project management · international" },
  { value: "CIOB", label: "CIOB — Chartered Institute of Building", hint: "Construction management · international" },
  { value: "RICS", label: "RICS — Royal Institution of Chartered Surveyors", hint: "Surveying · international" },
];
