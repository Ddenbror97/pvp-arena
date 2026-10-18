-- Level 20 frame becomes the RGB Light Frame. asset_key stays 'legend' so equipped rows keep working.
update public.cosmetics
set name = 'RGB Light Frame',
    description = 'A ring of living light. The final frame on the road.'
where asset_key = 'legend' and type = 'frame';
