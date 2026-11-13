// Must stay the first import: Sentry has to be initialised before anything else runs, so a headless launch is covered too.
import './src/services/crashReporting';
// Second: the launch is traced from here, so a launch that hangs while the modules below load still says so.
import './src/services/bootStart';
import 'expo-router/entry';

// Background tasks (the MARK_DONE notification action, the daily rebuild) are defined at
// NotificationScheduler's module scope. A headless launch — a killed-state notification action,
// a background task — never renders the router tree, so route-module imports never run there.
// This import is the only thing that makes TaskManager.defineTask execute in that mode.
import './src/services/NotificationScheduler';
import { markBoot } from './src/services/bootTrace';

markBoot('modules');
