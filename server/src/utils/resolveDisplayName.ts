import mongoose from 'mongoose';
import CompanyMembership from '../models/CompanyMembership';

export interface BaseUserIdentity {
  _id?: string | mongoose.Types.ObjectId;
  name: string;
  businessName?: string;
}

/**
 * Priority for resolving a user's display identity:
 * 1. Active Company membership name (if any company exists for user)
 * 2. Cosmetic user.businessName (if set & non-empty)
 * 3. Fallback to user.name
 */
export const resolveDisplayName = (
  user: BaseUserIdentity,
  companyName?: string | null
): string => {
  if (companyName && companyName.trim()) {
    return companyName.trim();
  }
  if (user.businessName && user.businessName.trim()) {
    return user.businessName.trim();
  }
  return user.name || '';
};

/**
 * Batched lookup: Given an array of user IDs, returns a Map of userId string -> Company name.
 * Executes exactly ONE database query regardless of how many user IDs are provided.
 */
export const getCompanyNamesForUserIds = async (
  userIds: (string | mongoose.Types.ObjectId)[]
): Promise<Map<string, string>> => {
  const companyNameMap = new Map<string, string>();
  if (!userIds || userIds.length === 0) return companyNameMap;

  // Deduplicate user IDs
  const uniqueUserIds = Array.from(
    new Set(userIds.map((id) => id.toString()))
  ).map((idStr) => new mongoose.Types.ObjectId(idStr));

  if (uniqueUserIds.length === 0) return companyNameMap;

  // Single batched query
  const memberships = await CompanyMembership.find({
    userId: { $in: uniqueUserIds },
  })
    .populate('companyId', 'name')
    .sort({ orgRole: 1, joinedAt: 1 }); // 'owner' comes before 'member' alphabetically

  for (const m of memberships) {
    const comp = m.companyId as any;
    if (comp && comp.name) {
      const uIdStr = m.userId.toString();
      if (!companyNameMap.has(uIdStr) || m.orgRole === 'owner') {
        companyNameMap.set(uIdStr, comp.name);
      }
    }
  }

  return companyNameMap;
};
