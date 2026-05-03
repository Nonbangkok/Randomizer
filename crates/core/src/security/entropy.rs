use std::collections::HashSet;

pub fn pool_size_for(password: &str) -> usize {
    let mut size = 0;
    let mut has_upper = false;
    let mut has_lower = false;
    let mut has_digit = false;
    let mut has_symbol = false;
    let mut other: HashSet<char> = HashSet::new();
    for c in password.chars() {
        if c.is_ascii_uppercase() { has_upper = true; }
        else if c.is_ascii_lowercase() { has_lower = true; }
        else if c.is_ascii_digit() { has_digit = true; }
        else if c.is_ascii() && !c.is_alphanumeric() { has_symbol = true; }
        else { other.insert(c); }
    }
    if has_upper { size += 26; }
    if has_lower { size += 26; }
    if has_digit { size += 10; }
    if has_symbol { size += 32; }
    size += other.len();
    size
}

pub fn entropy_bits(password: &str) -> f64 {
    let pool = pool_size_for(password);
    if pool <= 1 { return 0.0; }
    (password.chars().count() as f64) * (pool as f64).log2()
}

pub fn entropy_for_pool(length: usize, pool: usize) -> f64 {
    if pool <= 1 || length == 0 { return 0.0; }
    (length as f64) * (pool as f64).log2()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entropy_grows_with_length() {
        let a = entropy_bits("Aa1");
        let b = entropy_bits("Aa1Aa1Aa1");
        assert!(b > a);
    }

    #[test]
    fn pool_includes_all_classes() {
        assert_eq!(pool_size_for("Aa1!"), 26 + 26 + 10 + 32);
    }
}
