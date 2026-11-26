import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { MAX_INT } from '../helpers/constants.js';

/** The current user's salon, taken from the X-Salon-Id header. */
export const SalonId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<Request>();
    const header = String(request.headers['x-salon-id']);

    if (!/^[1-9]\d*$/.test(header) || Number(header) > MAX_INT) {
      throw new BadRequestException(
        'X-Salon-Id header must be a positive integer',
      );
    }
    return Number(header);
  },
);
