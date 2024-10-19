import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    shop: { type: String, required: true },
    state: { type: String, required: false },
    isOnline: { type: Boolean, required: true },
    scope: { type: String, required: false },
    expires: { type: Date, required: false },
    accessToken: { type: String, required: true },
    onlineAccessInfo: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: null
    }
});

sessionSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.__v; 
  }
})

const Session = mongoose.model('Session', sessionSchema);

export default Session;