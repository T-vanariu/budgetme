-- On sign-up: create the profile, seed default categories and the two income sources.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));

  insert into public.categories (user_id, name, bucket, icon, is_default)
  values
    (new.id, 'Rent', 'need', 'home', true),
    (new.id, 'Groceries', 'need', 'shopping-basket', true),
    (new.id, 'Transport', 'need', 'bus', true),
    (new.id, 'Phone & data', 'need', 'smartphone', true),
    (new.id, 'Utilities', 'need', 'plug', true),
    (new.id, 'Wantok & family', 'need', 'users', true),
    (new.id, 'School fees', 'need', 'graduation-cap', true),
    (new.id, 'Eating out', 'want', 'utensils', true),
    (new.id, 'Shopping', 'want', 'shopping-bag', true),
    (new.id, 'Entertainment', 'want', 'ticket', true),
    (new.id, 'Subscriptions', 'want', 'repeat', true),
    (new.id, 'Savings', 'savings', 'piggy-bank', true),
    (new.id, 'Debt repayment', 'savings', 'landmark', true);

  insert into public.income_sources (user_id, name, kind)
  values (new.id, 'Salary', 'salary'), (new.id, 'Side hustle', 'side_hustle');

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
