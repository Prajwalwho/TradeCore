import { instrumentRepository } from "./instrument.repository.js";

export const instrumentService = {
  async listInstruments() {
    return instrumentRepository.findAll();
  },
};