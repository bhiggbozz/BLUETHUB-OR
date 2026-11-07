import { getTenantFromUrl } from "@/utils/subdomain";
import { API, type TResponse } from ".";

export const LIVE_CLASS_FEATURE_KEY = "live_class";

export interface SchoolFeatureCheckResponse {
  isEnabled: boolean;
}

export interface SchoolFeatureDto {
  featureKey: string;
  isEnabled: boolean;
  schoolId?: string;
}

const headers = () => ({ "X-Tenant-ID": getTenantFromUrl() });

export const schoolFeaturesService = {
  // GET api/school-features/check?featureKey=...  (omit schoolId for own school)
  checkFeature: (featureKey: string, schoolId?: string) =>
    API.get<TResponse<SchoolFeatureCheckResponse>>("api/school-features/check", {
      headers: headers(),
      params: { featureKey, schoolId },
    }),

  // GET api/school-features  (omit schoolId for own school)
  list: (schoolId?: string) =>
    API.get<TResponse<SchoolFeatureDto[]>>("api/school-features", {
      headers: headers(),
      params: { schoolId },
    }),

  // POST api/school-features
  setFeature: (featureKey: string, isEnabled: boolean, schoolId?: string) =>
    API.post<TResponse<SchoolFeatureDto>>(
      "api/school-features",
      { featureKey, isEnabled, schoolId },
      { headers: headers() }
    ),
};
