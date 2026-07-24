import mongoose from 'mongoose';

const openAiErrorLogSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true
    },
    errorMessage: {
      type: String,
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const OpenAiErrorLog = mongoose.model('OpenAiErrorLog', openAiErrorLogSchema);

export const logOpenAiError = async (service, err) => {
  try {
    await OpenAiErrorLog.create({
      service,
      errorMessage: err?.message || String(err)
    });
  } catch (logErr) {
    process.stderr.write(`Failed to record OpenAI Error Log: ${logErr.message}\n`);
  }
};

export default OpenAiErrorLog;
