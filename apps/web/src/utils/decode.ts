import { jwtDecode } from "jwt-decode";


export interface Tuser {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    schoolId: string,
    schoolName: string,
    tenantId: string;
}
export interface DecodedToken {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": string;
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
    SchoolId: string;
    SchoolName: string;
    TenantId: string;
    exp: number;
    iat: string;
    iss: string;
    aud: string;
    jti: string;
}

export const decodeToken = (token: string): DecodedToken | null => {
    try {
        return jwtDecode<DecodedToken>(token);
    } catch {
        return null;
    }
};



export const getParsedToken = (token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) return null;

    return {
        id: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
        username: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
        email: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
        firstName: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"],
        lastName: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"],
        role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
        schoolId: decoded.SchoolId,
        schoolName: decoded.SchoolName,
        tenantId: decoded.TenantId,
    };
};