import { ValidationPipe } from '@nestjs/common';

export const validationPipe = new ValidationPipe({
  // Reject properties that a DTO doesn't declare (e.g. "salonId" in a body).
  whitelist: true,
  forbidNonWhitelisted: true,
  // Pass DTO class instances to handlers and apply @Type() conversions.
  transform: true,
});
