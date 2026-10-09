export interface IdentityVerificationResult {
  isEligible: boolean;
  score: number;
  reason?: string;
}

export abstract class IdentityVerificationPort {
  abstract verifyIdentity(
    email: string,
    name: string
  ): Promise<IdentityVerificationResult>;
}
