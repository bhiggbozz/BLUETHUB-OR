import { token } from "@/utils";

import { API, type TResponse } from ".";

// import { X_Tenant_ID } from "@/utils/tenant";
import { getTenantFromUrl } from "@/utils/subdomain";
const X_Tenant_ID  = getTenantFromUrl()

export const endpoints = {
  createSchool: "/api/School/createSchool",
  getState: "/api/School/getStates",
  updateSchoolCode: "/api/School/updateSchoolCode",
  createSchoolClass: "/api/school/createschoolclassroom",
  registerSubject: "/api/School/registersubject",
  getAllSchoolSubjects: "/api/School/getAllSchoolSubjects",
  registerClassroomSubject: "/api/School/RegisterClassroomSubject",
  updateSubject: "/api/School/updatesubject",
  updateClassroom: "/api/School/updateclassroom",
  getSubjectById: "/api/School/getSubjectById",
  getClassroomById: "/api/School/getClassroomById",
  getSubjectsByClassroom: "/api/School/getSubjectsByClassroom",
  assignTeachers: "/api/School/AssignTeachers",
  getAllClassrooms: "/api/School/GetAllClassrooms",
  getAllSubjects: "/api/School/GetAllSubjects",
  getSubjectsByClassCategory: "/api/School/GetSubjectsByClassCategory",
  getSubjectsBySubjectCategory: "/api/School/GetSubjectsBySubjectCategory",
  updateClassroomTeachers: "/api/School/UpdateClassroomTeachers",
  deleteSubjects: "/api/School/RemoveClassroomSubject",
  createTopic: "/api/School/topics",
  Provison: "/api/School/provision",
  schoolLogo:"/api/School/logo"
};

interface Ischool {
  subject: string;
  isActive: boolean;
  category: number;
  classCategory: number;
}

interface IRegisterSubject {
  subjects: Ischool[];
}

interface IregClass {
  name: string;
  noOfStudents?: number;
  subjectIds: any[];
}

export interface ICreateSchool {
  classrooms: IregClass[];
}

export interface Iprovison  {
  schoolName: string,
  location: string,
  countryId: number,
  stateId: number,
  state: string,
  address: string,
  hasBranch: boolean,
  tenantIdentifier: string,
  schoolCode: string,
  logoUrl: string,
  adminFirstName: string,
  adminMiddleName: string,
  adminLastName: string,
  adminEmail: string,
  adminUsername: string,
  adminPassword: string
}

export interface ISubject {
  subject: string;
  schoolId: string;
  category: string;
}

interface IUpdateClassroom {
  classroomUpdateViews: [
    {
      isActive: true,
      name: string,
      id: string;
    }
  ]
}

interface IdeleteSubjects {
  subjectIds: string[];
  classroomId: string;
}

interface IRegisterClassroomSubject {
  classroomId: string;
  subjectIds: string[];
}

export const schoolService = {
  registerSubject: (data: IRegisterSubject) => {
    return API.post<TResponse<unknown>>(endpoints.registerSubject, data, {
      headers: {
        Authorization: `Bearer ${token.getToken()}`,
        "X-Tenant-ID": X_Tenant_ID,
      },
    });
  },

  getAllSchoolSubject: (schoolId: string) => {
    return API.post(
      endpoints.getAllSchoolSubjects,
      {},
      {
        params: { schoolId },
        headers: {
          "X-Tenant-ID": X_Tenant_ID,
        },
      },
    );
  },
  schoolLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file); // ← was "file", must be "logo"
    return API.put<TResponse<unknown>>(endpoints.schoolLogo, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            "X-Tenant-ID": X_Tenant_ID,
        },
    });
},
  deleteSubjects:(data: IdeleteSubjects) => {
    return API.delete<TResponse<unknown>>(endpoints.deleteSubjects, {
      data,
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
      },
    });
  },

  // Registers one or more subjects to a classroom (inserts ClassroomSubject
  // rows) — this is the classroom's curriculum.
  registerClassroomSubject: (data: IRegisterClassroomSubject) => {
    return API.post<TResponse<unknown>>(endpoints.registerClassroomSubject, data, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
      },
    });
  },

  getAllSubject: () => {
    return API.get(endpoints.getAllSubjects, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
      },
    });
  },

  createClassRoom: (data: ICreateSchool) => {
    return API.post(endpoints.createSchoolClass, data, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
        Authorization: `Bearer ${token.getToken()}`,
      },
    });
  },

  getAllClassRooms: (
    params: { pageNumber?: number; pageSize?: number } = {},
  ) => {
    return API.get(endpoints.getAllClassrooms, {
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 50,
      },
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
        Authorization: `Bearer ${token.getToken()}`,
      },
    });
  },

  updateClassroom:(data: IUpdateClassroom) => {
     return API.post(endpoints.updateClassroom, data, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
      }
    });
  },

  getSubjectsByClassroomId: (classroomId: string) => {
    return API.get(endpoints.getSubjectsByClassroom, {
      params: { classroomId },
      headers: { "X-Tenant-ID": X_Tenant_ID },
    });
  },

  createTopic: (payload: {
    subjectId: string;
    classroomId: string;
    topics: { name: string; subTopics: string[] }[];
  }) => {
    return API.post<TResponse<unknown>>(endpoints.createTopic, payload, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
        Authorization: `Bearer ${token.getToken()}`,
      },
    });
  },

  getTopicsWithSubTopics: (subjectId: string, classroomId: string) => {
    return API.get(
      `/api/School/subject/${subjectId}/classroom/${classroomId}`,
      {
        headers: {
          "X-Tenant-ID": X_Tenant_ID,
          Authorization: `Bearer ${token.getToken()}`,
        },
      },
    );
  },

  getSubjectCurriculum: (subjectId: string, classroomId?: string) => {
    const params: Record<string, string> = {};
    if (classroomId) params.classroomId = classroomId;
    return API.get(`/api/School/subjects/${subjectId}/curriculum`, {
      params,
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
        Authorization: `Bearer ${token.getToken()}`,
      },
    });
  },

  addSubTopicsToTopic: (topicId: string, subTopics: string[]) => {
    return API.post(
      `/api/topic/subtopics/add`,
      { TopicId: topicId, SubTopics: subTopics },
      {
        headers: {
          "X-Tenant-ID": X_Tenant_ID,
          Authorization: `Bearer ${token.getToken()}`,
        },
      },
    );
  },

  Provision: (data: Iprovison) => {
    return API.post(endpoints.Provison, data, {
      headers: {
        "X-Tenant-ID": X_Tenant_ID,
        Authorization: `Bearer ${token.getToken()}`,
      },
    });
  },
};
