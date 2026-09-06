import { useState } from "react";
import { ArrowLeft, Check, ChevronDown, EllipsisVertical, Info, LayoutGrid, Loader2, } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Button,
} from "@bluethub/ui-kit";
import { type course, SubjectType } from "@/utils/constant";
import { SubjectRegisteredDialog } from "./subject-register-dialog";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { schoolService } from "@/services/school";

type SchoolLevel = "Primary" | "Junior Secondary" | "Senior Secondary";

const levels: SchoolLevel[] = ["Primary", "Junior Secondary", "Senior Secondary"];


const SUBJECT_TYPE_OPTIONS = [
  { label: "MAJOR", value: 1 as SubjectType },
  { label: "MINOR", value: 2 as SubjectType },
];



const RegisterNewSubject = () => {
  const [subjectName, setSubjectName] = useState("");
  const [selectedType, setSelectedType] = useState<SubjectType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [course, setCourses] = useState<course[]>([]);
  // const [classType,
  //     // setClassType
  // ] = useState<ClassCategory>(ClassCategory.Primary);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selected, setSelected] = useState<string | null>(null);
  const isSelected = (level: string) => selected === level;
  const toggle = (level: string) => setSelected(level);

  const navigate = useNavigate();


  const handleSelect = (value: SubjectType) => {
    setSelectedType(value);
    setIsOpen(false);
  };

  const handleAddToList = () => {
    if (!selectedType || !subjectName.trim()) return;
    setCourses((prev) => [
      ...prev,
      { category: selectedType, subject: subjectName.trim(), isActive: true, classCategory: 1 },
    ]);
    setSubjectName("");
  };

  const courseHandler = async () => {
    if (course.length === 0) return

    const payload = {
      subjects: course
    }
    try {
      setLoading(true);
      await schoolService.registerSubject(payload);
      setOpen(true)
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? error.response?.data?.responseMessage ??
          error.response?.data?.message ??
          error.message
          : (error as Error).message;
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="md:p-2 font-poppins">
        <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">

          {/* ── Top Nav ── */}
          <div className="flex items-center justify-between px-4 sticky top-0 z-30 py-4 sm:py-5 bg-chestnut">
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 hidden md:block" />
              <ArrowLeft  className="lg:hidden text-white"  onClick={() => navigate(-1)}/>
              <div className="space-y-0.5">
                <p className="text-white font-semibold text-sm leading-tight">Register Subject</p>
                <p className="text-white/60 text-xs leading-tight">Assign subject details</p>
              </div>
            </div>
            <button className="text-white">
              <EllipsisVertical size={18} />
            </button>
          </div>

          {/* ── White card ── */}
          <div className="flex-1 p-4 sm:p-8 bg-white/40 backdrop-blur-sm">

            {/* Left + Right — stacked on mobile, side by side on md+ */}
            <div className="flex flex-col md:flex-row gap-6">

              {/* ── Left Column ── */}
              <div className="w-full md:w-96">

                {/* Subject Name */}
                <div className="space-y-2 mb-6">
                  <Label className="text-chestnut text-sm font-semibold">Subject</Label>
                  <input
                    placeholder="e.g, jss 1A, primary"
                    className="ring-2 ring-chestnut/40 w-full font-medium border-0 px-4 py-2 text-sm sm:text-base rounded-md shadow-sm placeholder:text-chestnut text-chestnut placeholder:font-normal outline-none"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddToList()}
                  />
                </div>

                {/* Subject Type */}
                <div className="space-y-3 w-full mb-6">
                  <Label className="text-chestnut font-semibold text-sm">Subject type</Label>
                  <DropdownMenu onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`ring-2 w-full justify-between font-medium border-0 py-2 px-4 text-sm sm:text-base rounded-md group ${selectedType
                            ? "ring-chestnut/40 text-chestnut bg-chestnut/5"
                            : "ring-chestnut/20 text-chestnut/50 bg-white/80"
                          } hover:ring-chestnut/40 hover:bg-chestnut/5`}
                      >
                        <span className={selectedType ? "text-chestnut font-semibold" : ""}>
                          {selectedType
                            ? SUBJECT_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label
                            : "Select subject type"}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-chestnut/70 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border-2 border-chestnut/10 shadow-xl bg-white/95 backdrop-blur-sm p-2"
                      align="start"
                      sideOffset={8}
                    >
                      <DropdownMenuGroup className="space-y-1">
                        {SUBJECT_TYPE_OPTIONS.map(({ label, value }) => (
                          <DropdownMenuItem
                            key={label}
                            className={`font-normal text-sm sm:text-base py-3 px-4 rounded-lg cursor-pointer ${selectedType === value ? "bg-chestnut text-white" : "text-chestnut hover:bg-chestnut/10"
                              }`}
                            onClick={() => handleSelect(value)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{label}</span>
                              {selectedType === value && <Check className="w-5 h-5 ml-2 text-white" />}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* School Level Assignment */}
                <div className="flex flex-col gap-3 w-full">
                  <h2 className="text-sm font-semibold text-gray-900">School Level Assignment</h2>
                  <p className="text-xs font-semibold text-gray-600">Assign to</p>
                  <div className="grid grid-cols-2 gap-3">
                    {levels.map(level => {
                      const active = isSelected(level);
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => toggle(level)}
                          className="flex items-center justify-between rounded-md border-2 p-2 text-xs font-medium transition-colors"
                          style={{
                            borderColor: active ? "#292382" : "#d1d5db",
                            backgroundColor: active ? "#2923820d" : "#fff",
                            color: active ? "#292382" : "#374151",
                          }}
                        >
                          <span>{level}</span>
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? "bg-chestnut border-chestnut" : "border-gray-300"
                            }`}>
                            {active && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-1">
                    <Button
                      onClick={handleAddToList}
                      className="text-white text-sm bg-chestnut font-semibold rounded-md px-6 py-2.5 hover:opacity-90 transition-opacity"
                    >
                      Add subject
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Right Panel ── */}
              <div className="flex-1 min-w-0 pt-3 flex gap-3 sm:gap-4 bg-[#F3F6FF80] rounded-xl p-3 sm:p-4">

                {/* Major course */}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center px-3 sm:px-5 py-2 rounded-lg text-white text-xs sm:text-sm font-bold mb-3 bg-chestnut">
                    Major course
                  </div>
                  <div className="flex flex-col space-y-2">
                    {course
                      .filter(s => s.category === SubjectType.Major)
                      .map(s => (
                        <div key={s.subject} className="py-2 pl-3 sm:pl-4 rounded-[5px] border-b bg-[#F3F6FF] border-gray-100 last:border-0">
                          <span className="text-xs font-medium text-chestnut">{s.subject}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="w-px bg-chestnut/50 self-stretch" />

                {/* Minor course */}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex text-[#3A3A3ABF] bg-[#29238208] items-center px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold mb-3 border">
                    Minor course
                  </div>
                  <div className="flex flex-col space-y-2">
                    {course
                      .filter(s => s.category === SubjectType.Minor)
                      .map(s => (
                        <div key={s.subject} className="py-2 pl-3 sm:pl-4 rounded-[5px] border-b bg-[#F3F6FF] border-gray-100 last:border-0">
                          <span className="text-xs font-medium text-gray-600">{s.subject}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-8 pt-6 border-t border-gray-100 gap-3">
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm"
                >
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 sm:ml-auto">
                <button className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={courseHandler}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-chestnut rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Loading...</span></>
                  ) : (
                    <span>Add Subject</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <SubjectRegisteredDialog
        open={open}
        onClose={() => setOpen(false)}
        onAddAnother={() => setOpen(false)}
        onViewAll={() => navigate('/admin/registration/courses/view-all-subject')}
      />
    </>
  );
};

export default RegisterNewSubject;