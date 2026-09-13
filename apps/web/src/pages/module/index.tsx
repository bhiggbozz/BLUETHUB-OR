import { isStudentRoleData, isTeacherRoleData, useAuthContext } from "@/contexts/auth-context"
import moduleService, { type ModuleClassroom, type ModuleStudent, type ModuleSubject } from "@/services/module"
import { Filter, LayoutGrid, Menu, Search, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router-dom"

const normalizeStudent = (s: any): ModuleStudent => ({
  id: String(s?.id ?? s?.Id ?? ""),
  firstName: String(s?.firstName ?? s?.FirstName ?? ""),
  lastName: String(s?.lastName ?? s?.LastName ?? ""),
  userName: String(s?.userName ?? s?.UserName ?? ""),
  emailAddress: String(s?.emailAddress ?? s?.EmailAddress ?? ""),
  className: (() => {
    const c = s?.roleData?.classroom ?? s?.roleData?.Classroom ?? s?.roleData?.classrooms?.[0] ?? s?.roleData?.Classrooms?.[0] ?? null
    return String(c?.className ?? c?.ClassName ?? c?.name ?? c?.Name ?? "")
  })(),
  subjectNames: (() => {
    const raw = s?.roleData?.majorSubjects ?? s?.roleData?.MinorSubjects ?? s?.roleData?.subjects ?? []
    return (Array.isArray(raw) ? raw : []).map((sub: any) => sub.subjectName ?? sub.SubjectName ?? "").filter(Boolean).join(", ")
  })(),
  isActive: Boolean(s?.isActive ?? s?.IsActive ?? false),
})

const ModulePage = () => {
  const { user } = useAuthContext()
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>() ?? {}

  const [students, setStudents] = useState<ModuleStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [classrooms, setClassrooms] = useState<ModuleClassroom[]>([])
  const [subjects, setSubjects] = useState<ModuleSubject[]>([])

  const [selectedClassroom, setSelectedClassroom] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [viewMode, setViewMode] = useState<"class" | "subject">("class")

  const isTeacher = user?.roleName && ["HeadTeacher", "SubjectTeacher", "ClassTeacher"].includes(user.roleName)
  const isAdmin = user?.roleName && ["SuperAdministrator", "Administrator", "Admin"].includes(user.roleName)
  const isStudent = user?.roleName === "Student"

  const roleData = user?.roleData

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        if (isTeacher) {
          const [studentRes] = await Promise.all([
            moduleService.getTeacherStudents(),
          ])
          const payload = (studentRes.data as any)?.data ?? (studentRes.data as any)?.Data ?? []
          setStudents((Array.isArray(payload) ? payload : []).filter((s: any) => !!s.id))
        } else if (isAdmin) {
          const [studentRes, classRes] = await Promise.all([
            moduleService.getAllStudents(),
            moduleService.getClassrooms(),
          ])
          const payload = (studentRes.data as any)?.data ?? (studentRes.data as any)?.Data ?? []
          setStudents((Array.isArray(payload) ? payload : []).map(normalizeStudent).filter((s: ModuleStudent) => !!s.id))

          const classList = (classRes.data as any)?.data ?? (classRes.data as any)?.Data ?? []
          setClassrooms((Array.isArray(classList) ? classList : []).map((c: any) => ({
            id: String(c?.id ?? c?.Id ?? ""),
            name: String(c?.name ?? c?.Name ?? c?.className ?? c?.ClassName ?? ""),
          })))
        } else if (isStudent) {
          const [studentRes] = await Promise.all([
            moduleService.getAllStudents(),
          ])
          const payload = (studentRes.data as any)?.data ?? (studentRes.data as any)?.Data ?? []
          const all = (Array.isArray(payload) ? payload : []).map(normalizeStudent).filter((s: ModuleStudent) => !!s.id)

          if (roleData && isStudentRoleData(roleData) && roleData.classroom?.className) {
            setStudents(all.filter((s) => s.className === roleData.classroom.className))
          } else {
            setStudents(all)
          }
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin, isTeacher, isStudent, roleData])

  useEffect(() => {
    if (!isAdmin) return
    if (!selectedClassroom) { setSubjects([]); return }
    moduleService.getSubjectsByClassroom(selectedClassroom).then((res) => {
      const list = (res.data as any)?.data ?? (res.data as any)?.Data ?? []
      setSubjects((Array.isArray(list) ? list : []).map((s: any) => ({
        id: String(s?.id ?? s?.Id ?? s?.subjectId ?? s?.SubjectId ?? ""),
        subjectName: String(s?.name ?? s?.Name ?? s?.subjectName ?? s?.SubjectName ?? ""),
      })))
    }).catch(() => setSubjects([]))
  }, [selectedClassroom, isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    if (!viewMode || (!selectedClassroom && !selectedSubject)) return

    const refetch = async () => {
      setLoading(true)
      try {
        let res
        if (viewMode === "class" && selectedClassroom) {
          res = await moduleService.getStudentsByClassroom(selectedClassroom)
        } else if (selectedSubject) {
          res = await moduleService.getStudentsBySubject(selectedSubject)
        } else {
          res = await moduleService.getAllStudents()
        }
        const payload = (res.data as any)?.data ?? (res.data as any)?.Data ?? []
        setStudents((Array.isArray(payload) ? payload : []).map(normalizeStudent).filter((s: ModuleStudent) => !!s.id))
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    refetch()
  }, [selectedClassroom, selectedSubject, viewMode, isAdmin])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      [s.firstName, s.lastName, s.userName, s.emailAddress, s.className].join(" ").toLowerCase().includes(q)
    )
  }, [students, search])

  const heroTitle = isAdmin ? "School Module" : isTeacher ? "My Module" : "Class Module"
  const heroDesc = isAdmin
    ? "View and manage students by classroom or subject"
    : isTeacher
      ? "Students registered for your classes and subjects"
      : "Students in your class"

  return (
    <div className="font-poppins">
      <div className="border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
          <div className="flex items-center gap-3 min-w-0">
            {openMobileNav && (
              <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            )}
            <LayoutGrid className="w-5 h-5 hidden lg:inline text-white/90 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm sm:text-base truncate">{heroTitle}</h1>
              <p className="text-white/60 text-xs truncate hidden sm:block">{heroDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-medium">
            <Users className="w-4 h-4" />
            <span>{filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filter by:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setViewMode("class"); setSelectedSubject(""); setSelectedClassroom("") }}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${viewMode === "class" ? "bg-[#292382] text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    By Class
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode("subject"); setSelectedClassroom(""); setSelectedSubject("") }}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${viewMode === "subject" ? "bg-[#292382] text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    By Subject
                  </button>
                </div>

                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#292382]/30 min-w-[150px]"
                >
                  <option value="">{viewMode === "class" ? "All Classrooms" : "Select Classroom"}</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#292382]/30 min-w-[150px]"
                  disabled={!selectedClassroom && viewMode === "subject"}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isTeacher && roleData && isTeacherRoleData(roleData) && (
            <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl px-4 py-3 border border-amber-200/60">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {roleData.classrooms[0]?.className ?? "No class"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {roleData.classrooms[0]?.subjects.map((s) => s.subjectName).join(" · ") || "No subjects"}
                </p>
              </div>
            </div>
          )}

          {isStudent && roleData && isStudentRoleData(roleData) && (
            <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl px-4 py-3 border border-blue-200/60">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {roleData.classroom?.className ?? "My Class"}
                </p>
                <p className="text-xs text-slate-500">
                  {roleData.majorSubjects?.length ?? 0} Major · {roleData.minorSubjects?.length ?? 0} Minor subjects
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name, class, or email..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.2fr_1fr_100px] gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Student</span>
                <span>Email</span>
                <span>Class</span>
                <span>Subjects</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1.2fr_1fr_100px] gap-2 sm:gap-3 items-center px-4 py-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#292382] to-[#5C5FEF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate sm:hidden">
                          {student.className} · @{student.userName}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 truncate hidden sm:block">{student.emailAddress || "-"}</p>
                    <p className="text-sm text-slate-600 truncate">{student.className || "-"}</p>
                    <p className="text-xs text-slate-500 truncate hidden sm:block">{student.subjectNames || "-"}</p>
                    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${student.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {student.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="px-4 py-16 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No students found.</p>
                    <p className="text-xs text-slate-300 mt-1">Try adjusting your filters or search query.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModulePage
