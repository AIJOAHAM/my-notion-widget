const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });

        const quotes = [];
        for (const responseBlock of response.results) {
            let text = "";
            let source = "Notion 随笔"; // 默认出处
            let imageUrl = null;

            // 1. 如果是普通段落
            if (responseBlock.type === 'paragraph' && responseBlock.paragraph.rich_text.length > 0) {
                text = responseBlock.paragraph.rich_text.map(t => t.plain_text).join('');
            } 
            // 2. 如果是标题（原功能：通常用来做金句出处或正文小标题）
            else if (responseBlock.type.startsWith('heading_') && responseBlock[responseBlock.type].rich_text.length > 0) {
                text = responseBlock[responseBlock.type].rich_text.map(t => t.plain_text).join('');
                source = "Notion 标题";
            }
            // 3. 新增：如果是图片块（如你截图里的微信/微博聊天截图）
            else if (responseBlock.type === 'image') {
                imageUrl = responseBlock.image.type === 'external' 
                    ? responseBlock.image.external.url 
                    : responseBlock.image.file.url;
                
                // 如果图片带有 caption 说明文字，把它作为正文或补充
                if (responseBlock.image.caption && responseBlock.image.caption.length > 0) {
                    text = responseBlock.image.caption.map(t => t.plain_text).join('');
                }
                source = "Notion 图片分享";
            }

            if (text.trim().length > 0 || imageUrl) {
                quotes.push({
                    id: responseBlock.id,
                    text: text,
                    image: imageUrl,
                    source: source
                });
            }
        }

        res.status(200).json(quotes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
