-- Create a trigger to call the resistance-dispatch edge function on pvp_matches completion
-- Enable the pg_net extension if not already enabled (usually enabled by default in Supabase)
create extension if not exists "pg_net";
-- Function to trigger the webhook
create or replace function public.handle_pvp_match_completion() returns trigger language plpgsql security definer as $$ begin -- Only trigger when status changes to FINISHED
    if new.status = 'FINISHED'
    and old.status != 'FINISHED' then perform net.http_post(
        url := sys_context('secrets', 'SUPABASE_URL') || '/functions/v1/resistance-dispatch',
        headers := jsonb_build_object(
            'Content-Type',
            'application/json',
            'Authorization',
            'Bearer ' || sys_context('secrets', 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
            'type',
            'UPDATE',
            'table',
            'pvp_matches',
            'record',
            row_to_json(new),
            'old_record',
            row_to_json(old)
        )
    );
end if;
return new;
end;
$$;
-- Drop existing trigger if it exists to avoid conflicts
drop trigger if exists on_pvp_match_completion on public.pvp_matches;
-- Create the trigger
create trigger on_pvp_match_completion
after
update on public.pvp_matches for each row execute function public.handle_pvp_match_completion();