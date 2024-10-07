import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    shop: { type: String, required: true },
    state: { type: String, required: true },
    isOnline: { type: Boolean, required: true },
    scope: { type: String, required: true },
    expires: { type: Date, required: true },
    accessToken: { type: String, required: true },
    onlineAccessInfo: {
    expires_in: { type: Number, required: true },
    associated_user_scope: { type: String, required: true },
    session: { type: String, default: null },
    account_number: { type: String, default: null },
    associated_user: {
        id: { type: Number, required: true },
        first_name: { type: String, required: true },
        last_name: { type: String, required: true },
        email: { type: String, required: true },
        account_owner: { type: Boolean, required: true },
        locale: { type: String, required: true },
        collaborator: { type: Boolean, required: true },
        email_verified: { type: Boolean, required: true },
    },
    },
});
// userSchema.index({ email: 1 }, { unique: true });
// userSchema.index({ username: 1 }, { unique: true });
//if duplicate emails stop working just uncomment this

sessionSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.__v; 
  }
})

const Session = mongoose.model('Session', sessionSchema)

module.exports = Session