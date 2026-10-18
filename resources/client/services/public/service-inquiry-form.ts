export type InquiryFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
  packageId?: number;
};

export type InquiryFieldError = 'required' | 'invalid';

export type InquiryErrors = {
  name?: InquiryFieldError;
  email?: InquiryFieldError;
  message?: InquiryFieldError;
};

export function emptyInquiryForm(packageId?: number): InquiryFormState {
  return {
    name: '',
    email: '',
    phone: '',
    message: '',
    packageId,
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

  return errors;
}

export function buildInquiryPayload(form: InquiryFormState): {
  name: string;
  email: string;
  phone?: string;
  message: string;
  package_id?: number;
} {
  const payload: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    package_id?: number;
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

  return payload;
}
