const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await notion.blocks.children.list({ block_id: PAGE_ID });
        let quotes = [];
        const results = response.results || [];
        
        for (let i = 0; i < results.length; i++) {
            const block = results[i];
            let headingText = "";

            // 1. 识别标题（作为 source 出处）
            if (['heading_1', 'heading_2', 'heading_3'].includes(block.type)) {
                const rt = block[block.type].rich_text;
                if (rt && rt.length > 0) headingText = rt.map(t => t.plain_text).join('');
            }

            if (headingText && i + 1 < results.length) {
                let pText = "";
                let imageUrls = []; // 改为数组，支持收集多张图片
                let currentIndex = i + 1;

                // 2. 向后检查：提取紧随其后的段落文本（文案）
                if (currentIndex < results.length && results[currentIndex].type === 'paragraph') {
                    const nextBlock = results[currentIndex];
                    pText = nextBlock.paragraph.rich_text.map(t => t.plain_text).join('');
                    currentIndex++; // 游标往后移
                }

                // 3. 核心升级：连续向后检查，收集所有相邻的图片块（支持多张图）
                while (currentIndex < results.length && results[currentIndex].type === 'image') {
                    const imgBlock = results[currentIndex];
                    const url = imgBlock.image.type === 'external' 
                        ? imgBlock.image.external.url 
                        : imgBlock.image.file.url;
                    imageUrls.push(url);
                    currentIndex++;
                }

                // 只要有文字或者有任何图片，就成功压入数组
                if (pText || imageUrls.length > 0) {
                    quotes.push({ 
                        text: pText, 
                        images: imageUrls, // 传送图片数组
                        source: headingText, 
                        id: block.id 
                    });
                }
            }
        }
        res.status(200).json(quotes);
    } catch (error) {
        console.error("Notion API Error:", error);
        res.status(500).json({ error: error.message });
    }
};
