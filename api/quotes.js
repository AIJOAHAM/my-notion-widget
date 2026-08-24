const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const response = await notion.blocks.children.list({ block_id: PAGE_ID });
        let quotes = [];
        const results = response.results || [];
        
        for (let i = 0; i < results.length; i++) {
            const block = results[i];
            let headingText = "";
            if (['heading_1', 'heading_2', 'heading_3'].includes(block.type)) {
                const rt = block[block.type].rich_text;
                if (rt && rt.length > 0) headingText = rt.map(t => t.plain_text).join('');
            }
            if (headingText && i + 1 < results.length) {
                const nextBlock = results[i + 1];
                if (nextBlock.type === 'paragraph') {
                    const pText = nextBlock.paragraph.rich_text.map(t => t.plain_text).join('');
                    if (pText) quotes.push({ text: pText, source: headingText, id: block.id });
                }
            }
        }
        res.status(200).json(quotes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};