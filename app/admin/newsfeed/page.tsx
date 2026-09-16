import { AdminNewsFeed } from "@/components/admin/admin-newsfeed";
import { listAllPosts } from "@/lib/services/newsfeed";

export default async function AdminNewsFeedPage() {
  const posts = await listAllPosts();
  return <AdminNewsFeed posts={posts} />;
}
