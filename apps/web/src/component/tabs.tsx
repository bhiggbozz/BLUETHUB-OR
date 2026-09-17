import { useEffect, useState } from "react";
import type { SubjectType, course } from "@/utils/constant";
// import { useNavigate } from "react-router-dom";
import type { schoolInfo } from "@/services/index";
import { Label, toast } from "@bluethub/ui-kit";
import { localData } from "@/utils";
import type { Tuser } from "@/utils/decode";
import { schoolService } from "@/services/school";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";

// import CourseModal from "../layouts/Admincomponent/CourseModal";

interface CourseDisplayProps {
  tabs: course[];
  selected: SubjectType | null;
}

const Tabs = ({ tabs, selected }: CourseDisplayProps) => {
  const [activeTab, setActiveTab] = useState<SubjectType>(1);

  const [majorCourses, setMajorCourses] = useState<course[]>([]);
  const [minorCourses, setMinorCourses] = useState<course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<course[]>([]);
  const [loading, setLoading] = useState(false);
  // const [openModal, setOpenModal] = useState(false);
  // const navigate = useNavigate();
  // Group courses on update
  useEffect(() => {
    const majors = tabs.filter((c) => c.category === 1);
    const minors = tabs.filter((c) => c.category === 2);
    setMajorCourses(majors);
    setMinorCourses(minors);
  }, [tabs]);

  // Auto-switch tab if user selects category
  useEffect(() => {
    if (selected) {
      setActiveTab(selected);
    }
  }, [selected]);

  useEffect(() => {
    setSelectedCourses(tabs);
  }, [tabs]);

  // Remove course by subject name
  const removeCourse = (subject: course) => {
    setSelectedCourses((prev) =>
      prev.filter((c) => c.subject !== subject.subject)
    );

    if (activeTab === 1) {
      setMajorCourses((prev) =>
        prev.filter((c) => c.subject !== subject.subject)
      );
    } else {
      setMinorCourses((prev) =>
        prev.filter((c) => c.subject !== subject.subject)
      );
    }
  };

  const createdBy = localData.retrieve("user") as Tuser
  const schoolId = localData.retrieve("schoolInfo") as schoolInfo

  const submitCoursesHandler = async () => {
    if (!schoolId?.id) {
      console.error("School info is missing. Cannot proceed.");
      return;
    }

    const payload = {
      createdBy: createdBy?.id,
      SchoolId: createdBy.schoolId,
      subjects: selectedCourses,
    };


    try {
      setLoading(true);
      await schoolService.registerSubject(payload)
      // if (response.data.status === "successful") {
      //   navigate("/admin");
      // } else {
      //   console.error("Failed to submit courses:", response);
      // }
      // console.log(response.data)
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderCourses = (courses: course[]) => {
    if (courses.length === 0) {
      return (
        <div className="p-4 text-center text-gray-400 border rounded">
          No course added yet
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2  gap-x-6 gap-y-4 max-w-screen-sm mx-auto   border-0 border-red-800 ">
        {courses.map((course, i) => (
          <div
            key={i}
            className="group flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 cursor-pointer bg-chestnut/10 border-2 border-chestnut/30 "
          >

            <Label
              htmlFor={course.subject}
              className="flex-1 cursor-pointer font-medium transition-colors text-chestnut"
            >
              {course.subject}
            </Label>

            <span
              className="text-[#4F0970] text-xl font-bold cursor-pointer hidden group-hover:block"
              onClick={() => removeCourse(course)}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    );
  };


  return (
    <section>
      <div className=" h-139.75 overflow-y-scroll scrollbar-hide relative border border-white rounded-lg bg-white/90 shadow-[-1px_2px_12px_0px_#00000021] p-4">
        {/* Tabs */}
        <ul className="flex gap-3 mb-4">
          {([
            { label: "MAJOR", value: 1 },
            { label: "MINOR", value: 2 },
          ] as { label: string; value: SubjectType }[]).map(({ label, value }) => (
            <li key={label} className="flex-1">
              <button
                onClick={() => setActiveTab(value)}
                className={`w-full text-center py-3 font-hand text-lg rounded-lg shadow-[-1px_2px_12px_0px_#00000021] transition-all duration-300 tracking-wide ${activeTab ===  value
                  ? "bg-chestnut text-white/90 shadow-lg"
                  : "text-chestnut hover:bg-white/50"
                  }`}
              >
                {label} COURSES
              </button>
            </li>
          ))}
        </ul>

        {/* Tab Content */}
        <div>
          {activeTab === 1
            ? renderCourses(majorCourses)
            : renderCourses(minorCourses)}
        </div>
      </div>

      <button
        disabled={loading}
        className="w-77.5 text-white bg-chestnut shadow-[-1px_2px_12px_0px_#00000021] rounded-xl py-4 my-4  float-end font-poppins font-semibold text-xl"
        onClick={submitCoursesHandler}
      >
        {loading ? (
          <Loader2 className="size-5 mx-auto animate-spin text-white" />
        ) : (
          <span> Submit</span>
        )}
      </button>

      {/* {openModal && (
        <CourseModal
          tabs={tabs}
          openModal={openModal}
          setOpenModal={setOpenModal}
        />
      )} */}
    </section>
  );
};

export default Tabs;
