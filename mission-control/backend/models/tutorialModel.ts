import { model, Schema } from "mongoose";

export type Tutorial = {
  title: string;
  tag: string;
  youtubeId: string;
};

const tutorialSchema = new Schema<Tutorial>({
  title: {
    type: String,
    required: [true, "Please provide a title for the tutorial."]
  },
  tag: {
    type: String,
    required: [true, "Please provide a tag for the tutorial."]
  },
  youtubeId: {
    type: String,
    required: [true, "Please provide a youtubeId for the tutorial."]
  }
});

const TutorialModel = model("Tutorial", tutorialSchema);
export default TutorialModel;
