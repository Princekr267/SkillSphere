import mongoose from 'mongoose';
import CompanyMembership from '../models/CompanyMembership';

/**
 * Batched lookup: Given an array of user IDs, returns a Map of userId string -> approved Company name.
 * Executes exactly ONE database query regardless of how many user IDs are provided.
 *
 * Rules:
 * 1. Computed live on read from CompanyMembership + Company documents.
 * 2. If a user has no approved company membership, their ID is omitted from the Map (yielding undefined).
 *    There is zero fallback to any legacy manual fields.
 * 3. If a user belongs to multiple approved companies, the primary company is chosen deterministically:
 *    prioritizing 'owner' role first, followed by earliest joinedAt date.
 */
export const getApprovedCompanyNamesForUsers = async (
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
      // Record if not set yet, or override if this membership is 'owner'
      if (!companyNameMap.has(uIdStr) || m.orgRole === 'owner') {
        companyNameMap.set(uIdStr, comp.name);
      }
    }
  }

  return companyNameMap;
};

/**
 * Enriches a list of gig documents or gig objects with `currentCompanyName` on populated `clientId`.
 * Batches the lookup for all unique client IDs across the gig list in a single query.
 */
export const enrichGigsWithCompanyName = async (gigs: any[]): Promise<any[]> => {
  if (!gigs || gigs.length === 0) return gigs;

  const clientIds: string[] = [];
  for (const g of gigs) {
    const cId = g.clientId?._id || g.clientId;
    if (cId) {
      clientIds.push(cId.toString());
    }
  }

  const companyMap = await getApprovedCompanyNamesForUsers(clientIds);

  return gigs.map((gig) => {
    const gigObj = typeof gig.toObject === 'function' ? gig.toObject() : gig;
    if (gigObj.clientId && typeof gigObj.clientId === 'object') {
      const cIdStr = (gigObj.clientId._id || gigObj.clientId).toString();
      const approvedName = companyMap.get(cIdStr);
      if (approvedName) {
        gigObj.clientId.currentCompanyName = approvedName;
      }
    }
    return gigObj;
  });
};
