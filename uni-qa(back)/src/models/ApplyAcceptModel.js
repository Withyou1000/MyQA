const mongoose = require('mongoose');

const ApplyAcceptSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answererName: { type: String, required: true },
    finish: { type: Boolean, enum: [true, false], default: false },
    createdAt: { type: Date, default: Date.now }
});
// 这就是告诉数据库：
// "请把authorId按字母表顺序排好，每个authorId下面再把finish按true/false排好"
ApplyAcceptSchema.index({ authorId: 1, finish: 1 });
module.exports = mongoose.model('ApplyAccept', ApplyAcceptSchema);