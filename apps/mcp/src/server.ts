import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server=new McpServer({name:'hogwatch',version:'0.1.0'});
const dashboard={team:'Arkansas',season:2026,record:'1-1',hogIndex:74,components:{offense:72,defense:78,coaching:76,development:71}};
server.tool('get_season_dashboard','Return Arkansas season progress and HOG Index.',{},async()=>({content:[{type:'text',text:JSON.stringify(dashboard)}]}));
server.tool('get_metric_trend','Return a weekly trend for a HogWatch metric.',{metric:z.string()},async({metric})=>({content:[{type:'text',text:JSON.stringify({metric,weeks:[1,2],values:[68,74],note:'Mock data until provider ingestion is wired.'})}]}));
server.tool('compare_games','Compare two Arkansas games.',{gameA:z.string(),gameB:z.string()},async({gameA,gameB})=>({content:[{type:'text',text:JSON.stringify({gameA,gameB,summary:'Mock comparison. Replace with shared repository data.'})}]}));
await server.connect(new StdioServerTransport());
