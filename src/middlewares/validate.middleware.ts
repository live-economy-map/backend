import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const validate = <T>(schema: ZodSchema<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData: T = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      const data = parsedData as any;

      // ✅ Use Object.assign instead of direct reassignment
      if (data.body) Object.assign(req.body, data.body);
      if (data.params) Object.assign(req.params, data.params);
      if (data.query) Object.assign(req.query, data.query);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => {
          const path = issue.path.join('.');
          return `${path}: ${issue.message}`;
        });

        return next(new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errorMessages));
      }
      next(error);
    }
  };
};

export default validate;
