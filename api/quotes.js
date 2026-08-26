const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });

        const quotes = [];
        
        // 遍历页面中的所有块，不管什么格式，只要是文本就抓出来！
        for (const block of response.results) {
            let text = "";
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                text = block.paragraph.rich_text.map(t => t.plain_text).join('');
            } else if (block.type === 'quote' && block.quote.rich_text.length > 0) {
                text = block.quote.rich_text.map(t => t.plain_text).join('');
            } else if (block.type.startsWith('heading_') && block[block.type].rich_text.length > 0) {
                text = block[block.type].rich_text.map(t => t.plain_text).join('');
            }

            if (text.trim().length > 0) {
                quotes.push({
                    id: block.id,
                    text: text,
                    source: "Notion 随笔"
                });
            }
        }

        res.status(200).json(quotes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
