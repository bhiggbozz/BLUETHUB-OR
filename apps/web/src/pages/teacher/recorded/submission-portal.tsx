import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  Label,
  Input,
  RadioGroup,
  RadioGroupItem 
} from "@bluethub/ui-kit";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import CalendarField from "@/shared/calendar-field";

import { MediaUpload } from "@/shared/media-upload";
import { FileList } from "@/shared/file-list";
import type { FileItem } from "@/shared/file-list";
import  ApprovalStatusDialog  from "@/shared/approval-status-dialog";
import TitleBar from "@/shared/title-bar";

const SubmissionPortal = () => {
  const [selectSubject, setSelectSubject] = useState<string>("");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [classType, setClassType] = useState<string>("live");
  const [open, setOpen] = useState(false);

  const subjects = [
    { label: "BASIC TECH" },
    { label: "PHYSICS" },
    { label: "TECHNICAL D." },
    { label: "IT" },
  ];

  const files: FileItem[] = [
    {
      id: "1",
      type: "audio",
      name: "Recording Audio file 12...",
      date: "21 July 2025, 12:04Am",
      size: "2.4MB"
    },
    {
      id: "2",
      type: "video",
      name: "Video Content file mp4.",
      date: "21 July 2025, 12:07Am",
      size: "2.4MB"
    },
  ];

  return (
    <div className="min-h-screen ">

      <div className="max-w-6xl mx-auto mt-10 rounded-xl shadow-lg bg-white overflow-hidden">
        <TitleBar title=" Class Submission Portal" />

        {/* Main Form */}
        <section className="p-6 md:p-10 space-y-8">
          {/* --- Class + Topic Section --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-chestnut font-medium text-base">
                Class*
              </Label>

              <DropdownMenu onOpenChange={setIsSubjectDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`relative ring-2 w-full justify-between text-base rounded-lg py-5 transition-all duration-300 ${
                      selectSubject
                        ? "ring-chestnut/40 text-chestnut bg-chestnut/5"
                        : "ring-chestnut/20 text-chestnut/50 bg-white/80"
                    } hover:ring-chestnut/40 hover:bg-chestnut/5 focus:ring-chestnut/50`}
                  >
                    <span
                      className={`${
                        selectSubject
                          ? "text-chestnut font-semibold"
                          : "text-chestnut/60"
                      }`}
                    >
                      {selectSubject || "Select Class"}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-chestnut/70 transition-transform duration-300 ${
                        isSubjectDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) rounded-lg border border-chestnut/10 shadow-lg bg-white/95 backdrop-blur-sm p-2"
                  align="start"
                  sideOffset={8}
                >
                  <DropdownMenuGroup className="space-y-1">
                    {subjects.map((subject) => (
                      <DropdownMenuItem
                        key={subject.label}
                        className={`font-medium text-base py-2.5 px-4 rounded-md transition-all duration-150 ${
                          selectSubject === subject.label
                            ? "bg-chestnut text-white"
                            : "text-chestnut hover:bg-chestnut/10"
                        }`}
                        onClick={() => setSelectSubject(subject.label)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{subject.label}</span>
                          {selectSubject === subject.label && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="space-y-2">
                <Label
                  htmlFor="topic"
                  className="font-semibold text-sm text-chestnut"
                >
                  Topic*
                </Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="Molecule and Matter"
                  className="placeholder:text-chestnut border rounded-md px-3 py-5 text-sm focus:ring-2 focus:ring-chestnut"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <Label className="font-medium text-base text-chestnut">
                Aim and Objectives
              </Label>
              <textarea
                rows={5}
                placeholder="e.g. To build confidence, meet like-minded peers, and get accountability for my goals"
                className="w-full ring ring-chestnut/20 p-3 bg-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-chestnut"
              ></textarea>
            </div>
          </div>

          {/* --- Subtopic + Date + Time --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold text-sm text-chestnut">
                Sub-Topic*
              </Label>
              <Input
                type="text"
                placeholder="Organic and Inorganic Matter"
                className="placeholder:text-chestnut border rounded-md px-3 py-5 text-sm focus:ring-2 focus:ring-chestnut"
              />
            </div>

            <CalendarField />

            <div className="space-y-2">
              <Label
                htmlFor="time-picker"
                className="font-semibold text-sm text-chestnut"
              >
                Time
              </Label>
              <Input
                type="time"
                id="time-picker"
                step="1"
                defaultValue="10:30:00"
                className="bg-white border rounded-md px-3 py-5 text-sm focus:ring-2 focus:ring-chestnut"
              />
            </div>
          </div>

          {/* --- Type & Conditional Media Upload --- */}
          <div className="border border-chestnut/20 rounded-lg p-6 space-y-6">
            <div>
              <Label className="text-chestnut font-medium mb-3 block">
                Class Type
              </Label>
              <RadioGroup
                value={classType}
                onValueChange={setClassType}
                className="flex flex-wrap gap-5 text-chestnut"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="live" id="r1" />
                  <Label htmlFor="r1">Live Class</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="recorded" id="r2" />
                  <Label htmlFor="r2">Recorded Class</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="interactive" id="r3" />
                  <Label htmlFor="r3">Interactive Class</Label>
                </div>
              </RadioGroup>
            </div>

            {/* ✅ Only show this section if Recorded Class is selected */}
            {classType === "recorded" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300">
                <MediaUpload onFilesSelected={(files) => files} />
                <FileList
                  files={files}
                  onDelete={(id) => id}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button className=" border border-[#AC6100]   px-6 py-3 font-medium text-sm rounded-md cursor-pointer">
              <span className="text-[#AC6100] font-medium text-base">
                Edit{" "}
              </span>
            </button>

            <button onClick={() => setOpen(true)} className="bg-chestnut  px-4 py-3  font-medium text-sm rounded-md cursor-pointer">
              <span className="text-white font-medium text-base">
                Submitted For Approval
              </span>
            </button>
          </div>
        </section>

        {/* <ApprovalStatusDialog
          open={open}
          onOpenChange={setOpen}
          type="approved" // or "submitted"
          date="23th September 2025, 9:50AM"
        /> */}

        <ApprovalStatusDialog
        open={open}
        onOpenChange={setOpen}
        type="submitted"
      />
      </div>
    </div>
  );
};

export default SubmissionPortal;
