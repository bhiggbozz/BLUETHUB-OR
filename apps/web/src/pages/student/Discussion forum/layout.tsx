import { useState } from "react";
import StudyGroupsList from "./component/StudyGroupsList"
import { CreateForumModal } from "./component/create-forum-modal";
import StudyGroupsHero from "./component/StudyGroupsHero";

const DiscussionLayout = () => {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="pt-2">
      <StudyGroupsHero  onCreateForum={() => setShowModal(true)}/>
      <StudyGroupsList onCreateForum={() => setShowModal(true)} />
      <div>
        <CreateForumModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={(form) => {
            //console.log("New forum:", form);
            // call your API here
            form
          }}
        />
      </div>
    </div>
  )
}

export default DiscussionLayout