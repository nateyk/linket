export type InquiryFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
  packageId?: number;
  answers?: string[];
};

export type InquiryFieldError = 'required' | 'invalid' | 'too_long';

export type InquiryErrors = {
  name?: InquiryFieldError;
  email?: InquiryFieldError;
  message?: InquiryFieldError;
  answers?: Record<number, InquiryFieldError>;
};

export function emptyInquiryForm(packageId?: number, buyerQuestions: string[] = []): InquiryFormState {
  return {
    name: '',
    email: '',
    phone: '',
    message: '',
    packageId,
    answers: buyerQuestions.map(() => ''),
  };
}

export function validateInquiryForm(form: InquiryFormState): InquiryErrors {
  const errors: InquiryErrors = {};

  if (!form.name.trim()) {
    errors.name = 'required';
  }

  if (!form.email.trim()) {
    errors.email = 'required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'invalid';
  }

  if (!form.message.trim()) {
    errors.message = 'required';
  }

  form.answers?.forEach((answer, index) => {
    if (answer.trim().length > 500) {
      errors.answers ??= {};
      errors.answers[index] = 'too_long';
    }
  });

  return errors;
}

export function buildInquiryPayload(form: InquiryFormState): {
  name: string;
  email: string;
  phone?: string;
  message: string;
  package_id?: number;
  answers?: string[];
} {
  const payload: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    package_id?: number;
    answers?: string[];
  } = {
    name: form.name.trim(),
    email: form.email.trim(),
    message: form.message.trim(),
  };

  if (form.phone.trim()) {
    payload.phone = form.phone.trim();
  }

  if (form.packageId) {
    payload.package_id = form.packageId;
  }

  if (form.answers?.some(answer => answer.trim())) {
    // Keep positions, including blank earlier answers; the server decides
    // which configured question each answer belongs to.
    payload.answers = form.answers.map(answer => answer.trim());
  }

  return payload;
}
