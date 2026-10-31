import { basicsRoute } from "@/app/components/pages/BasicsRoute";

export const dynamicParams = false;

const route = basicsRoute("fr");
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
