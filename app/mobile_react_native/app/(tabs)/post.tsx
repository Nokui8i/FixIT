import { CreateRequestScreen } from "@/features/requests/screens/CreateRequestScreen";

/**
 * Post a new request (tab). URL: `/post`
 *
 * Was `/request/new` — kept on its own path so `app/request/*` stays for offers/booking stacks.
 */
export default function PostTabRoute() {
  return <CreateRequestScreen />;
}
