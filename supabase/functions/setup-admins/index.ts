import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const users = [
      {
        email: 'admin@faafu.edu.mv',
        password: 'admin123',
        full_name: 'Administrator',
        role: 'admin',
      },
      {
        email: 'superadmin@faafu.edu.mv',
        password: 'superadmin123',
        full_name: 'Super Administrator',
        role: 'super_admin',
      },
    ];

    const results = [];

    for (const user of users) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((u) => u.email === user.email);

      if (existingUser) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: user.password }
        );

        if (updateError) {
          results.push({ email: user.email, action: 'password_reset', error: updateError.message });
        } else {
          results.push({ email: user.email, action: 'password_reset', success: true, password: user.password });
        }
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (authError) {
          results.push({ email: user.email, action: 'create', error: authError.message });
          continue;
        }

        if (authData.user) {
          const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            section: null,
          });

          if (profileError) {
            results.push({ email: user.email, action: 'create', error: profileError.message });
          } else {
            results.push({ email: user.email, action: 'create', success: true, password: user.password });
          }
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});