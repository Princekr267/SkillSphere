import mongoose from 'mongoose';
import { getCompanyNamesForUserIds } from './resolveDisplayName';

export { getCompanyNamesForUserIds as getApprovedCompanyNamesForUsers };

/**
 * Enriches a list of gig documents or gig objects with `currentCompanyName` on populated `clientId`.
 * Batches the lookup for all unique client IDs across the gig list in a single query.
 * Follows the 3-tier display priority:
 * 1. Company Name (if client belongs to any active company)
 * 2. businessName (if set on client profile)
 * 3. undefined (so frontend falls back to clientId.name)
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

  const companyMap = await getCompanyNamesForUserIds(clientIds);

  return gigs.map((gig) => {
    const gigObj = typeof gig.toObject === 'function' ? gig.toObject() : gig;
    if (gigObj.clientId && typeof gigObj.clientId === 'object') {
      const cIdStr = (gigObj.clientId._id || gigObj.clientId).toString();
      const realCompName = companyMap.get(cIdStr);
      if (realCompName) {
        gigObj.clientId.currentCompanyName = realCompName;
      } else if (gigObj.clientId.businessName && gigObj.clientId.businessName.trim()) {
        gigObj.clientId.currentCompanyName = gigObj.clientId.businessName.trim();
      }
    }
    return gigObj;
  });
};
