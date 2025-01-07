import mongoose from "mongoose";

const ClipSchema = mongoose.Schema(
  {
    clipUrl: {
      type: String,
      required: true
    },
    clipId: {
      type: String,
      required: true
    },
    desc: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const MoveSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true
    },
    desc: {
      type: String,
      default: ""
    },
    imgUrl: {
      type: String,
      default: ""
    },
    clips: {
      type: [ClipSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    startDate: {
      type: Date,
      default: function () {
        return this.createdAt;
      }
    },
    finished: {
      type: Boolean,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Move = mongoose.model('Move', MoveSchema)