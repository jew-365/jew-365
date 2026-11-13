import { startBootTrace } from '@/services/bootTrace';

// Imported by the root index.js right after crash reporting, so the launch is traced before the rest of the modules load.
startBootTrace();
