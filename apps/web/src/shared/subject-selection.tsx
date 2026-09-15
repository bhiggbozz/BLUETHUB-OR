import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";

import {
  Button,
  Checkbox,
  Label,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogTitle,
  ScrollArea
} from "@bluethub/ui-kit";
import { Link } from "react-router-dom";

// Subject data structure
interface Subject {
  id: string;
  name: string;
  category: "minor" | "major";
}

const SUBJECTS: Subject[] = [
  { id: "christian-studies", name: "Christian Studies", category: "minor" },
  { id: "islamic-studies-1", name: "Islamic Studies", category: "minor" },
  { id: "vocational-1", name: "Vocational", category: "minor" },
  { id: "short-hand-writing-1", name: "Short Hand Writing", category: "minor" },
  { id: "health-education-1", name: "Health Education", category: "minor" },
  { id: "business-education-1", name: "Business Education", category: "minor" },
  { id: "islamic-studies-2", name: "Islamic Studies", category: "minor" },
  { id: "vocational-2", name: "Vocational", category: "minor" },
  { id: "short-hand-writing-2", name: "Short Hand Writing", category: "minor" },
  { id: "health-education-2", name: "Health Education", category: "minor" },
  { id: "business-education-2", name: "Business Education", category: "minor" },
];

interface SubjectSelectionProps {
  selectClass?: string;
}

const SubjectSelection = ({ selectClass }: SubjectSelectionProps) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "christian-studies",
    "health-education-1",
    "business-education-1",
    "health-education-2",
    "business-education-2",
  ]);
  const [backToDashboard, setBackToDashboard] = useState<boolean>(false);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = () => {
    // console.log("Selected subjects:", selectedSubjects);
    // Handle form submission
    if (selectedSubjects.length > 0) {
      setBackToDashboard(true);
    }
  };

  const handleCancel = () => {
    //console.log("cancelling...");
  };

  return (
    <div className="min-h-screen flex p-6">
      <div className="w-full">
        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 ">
          {/* Header */}
          <div className="">
            <h2 className="font-bold text-xl  py-8 border-b border-chestnut/70  text-center leading-tight text-chestnut">
              {selectClass ? (
                selectClass + " " + "Subject"
              ) : (
                <p className="capitalize">no class select yet</p>
              )}
            </h2>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Category Header */}
            <div className="mb-6">
              <h3 className="text-chestnut font-semibold text-sm  mb-1">
                Minor Course
              </h3>
            </div>

            {/* Subjects List */}
            <ScrollArea className="h-100 pr-4">
              <div className="space-y-3">
                {SUBJECTS.map((subject) => (
                  <div
                    key={subject.id}
                    className={`group flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 cursor-pointer ${selectedSubjects.includes(subject.id)
                      ? "bg-chestnut/10 border-2 border-chestnut/30"
                      : "bg-white/50 border-2 border-gray-200 hover:border-chestnut/20 hover:bg-chestnut/5"
                      }`}
                    onClick={() => handleSubjectToggle(subject.id)}
                  >
                    <Checkbox
                      id={subject.id}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={() => handleSubjectToggle(subject.id)}
                      className="w-5 h-5 border-2 data-[state=checked]:bg-chestnut data-[state=checked]:border-chestnut"
                    />
                    <Label
                      htmlFor={subject.id}
                      className={`flex-1 cursor-pointer font-medium transition-colors ${selectedSubjects.includes(subject.id)
                        ? "text-chestnut"
                        : "text-gray-700 group-hover:text-chestnut"
                        }`}
                    >
                      {subject.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Selection Counter */}
            <div className="mt-6 p-4 bg-chestnut/5 rounded-xl border border-chestnut/20">
              <p className="text-chestnut/70 text-sm text-center">
                <span className="font-bold text-chestnut">
                  {selectedSubjects.length}
                </span>{" "}
                subject{selectedSubjects.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 py-6 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-xl font-semibold text-base transition-all"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedSubjects.length === 0}
                className={`flex-1 py-6 rounded-xl font-semibold text-base transition-all ${selectedSubjects.length > 0
                  ? "bg-linear-to-r from-chestnut to-chestnut/90 hover:from-chestnut/90 hover:to-chestnut text-white shadow-lg hover:shadow-xl cursor-pointer"
                  : "bg-chestnut/50 text-white cursor-not-allowed"
                  }`}
              >
                Submit
                <Send className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Alert Dialog */}
            <AlertDialog
              open={backToDashboard}
              onOpenChange={setBackToDashboard}
            >
              <AlertDialogContent className="border border-white/20 backdrop-blur-xl shadow-2xl max-w-md">
                <AlertDialogTitle />
                <AlertDialogHeader>
                  <AlertDialogDescription className="text-center font-poppins  text-chestnut font-medium text-base  mb-10">
                    You’ve Successfully Registered Student.
                    Dashboard
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogTitle />

                <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col items-center justify-center">
                  <Link to="/admin" className="w-36.5">
                    <AlertDialogAction className="w-full cursor-pointer text-white bg-chestnut hover:bg-chestnut/90 py-6 font-bold text-lg rounded-xl">
                      OK
                    </AlertDialogAction>
                  </Link>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelection;
