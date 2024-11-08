import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileData: { type: Buffer, required: true }, 
  uploadDate: { type: Date, default: Date.now }, 
});

const File = mongoose.model('File', fileSchema);
export default File;
