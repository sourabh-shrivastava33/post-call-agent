import "dotenv/config";
class NotionIntegration {
  private notionSecretKey: string = process.env.NOTION_KEY;
  private notionPageId: string = process.env.Notion_PAGE_ID;
}
