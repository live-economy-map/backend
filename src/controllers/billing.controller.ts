import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { billingService } from '../services/billing.service.js';
import { AuthRequest } from '../types/index.js';

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const result = await billingService.listPlans();
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Subscription plans retrieved', result));
});

export const initializeCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await billingService.initializeCheckout(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Checkout initialized successfully', result));
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const txRef = req.params.txRef as string;
  const result = await billingService.verifyPayment(txRef);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Payment verification complete', result));
});

export const getMySubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await billingService.getUserSubscription(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Subscription details retrieved', result));
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature =
    (req.headers['x-chapa-signature'] as string) ||
    (req.headers['chapa-signature'] as string) ||
    '';
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  const result = await billingService.handleChapaWebhook(signature, rawBody, req.body);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Webhook processed successfully', result));
});

export const adminCreatePlan = asyncHandler(async (req: Request, res: Response) => {
  const result = await billingService.createPlan(req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Subscription plan created', result));
});

export const adminListPayments = asyncHandler(async (req: Request, res: Response) => {
  const result = await billingService.adminListPayments(req.query as any);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Payments retrieved successfully', result));
});

export const adminUpdateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const result = await billingService.adminUpdateSubscription(req.params.id as string, req.body);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Subscription updated successfully', result));
});
