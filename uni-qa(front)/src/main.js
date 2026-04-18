import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import GlobalNotification from "@/components/GlobalNotification.vue";
export function createApp() {
	const app = createSSRApp(App);
	 app.component('GlobalNotification', GlobalNotification)
	return {
		app,
	};
}
